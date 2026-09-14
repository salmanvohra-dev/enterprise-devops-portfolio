# 3-Tier AWS Architecture with Terraform & CI/CD Pipeline

**Architecture Overview**
graph TD
    User([User / Internet]) -->|HTTP/HTTPS| ALB[Application Load Balancer<br/>Public Subnet]
    
    subgraph VPC [AWS VPC]
        subgraph Public Subnet
            ALB
            NAT[NAT Gateway + EIP]
        end
        
        subgraph Private Subnet
            ASG[Auto Scaling Group<br/>EC2 App Instances]
            RDS[(RDS Database<br/>MySQL / PostgreSQL)]
        end
    end

    User -.->|Outbound updates| NAT
    NAT -.->|Internet Access| Ext[External Repos / Updates]

    ALB -->|Internal VPC Traffic<br/>Port 80/443| ASG
    ASG -->|Port 3306/5432<br/>Database Traffic| RDS

* **Public Subnet:** Houses the Application Load Balancer (ALB) acting as the single internet-facing entry point and the NAT Gateway for outbound traffic routing.
* **Private Subnet:** Secures the backend application instances inside an Auto Scaling Group (ASG) and the isolated RDS database tier.
* **Connectivity Flow:** User requests hit the ALB in the public subnet, which proxies traffic directly to the private ASG instances over the internal VPC network, while outbound packages from private instances exit via the NAT Gateway.

**Tech Stack**

* **Cloud Provider:** Amazon Web Services (AWS)
* **Infrastructure as Code:** Terraform (with remote S3 backend and DynamoDB state locking)
* **CI/CD Automation:** GitHub Actions (`terraform init`, `plan`, `apply`) with encrypted repository secrets

**Production Troubleshooting & Real-World Errors**

* **RDS Connection Timeout / Security Group Block:** Caused by missing inbound rules on port 3306/5432 in the RDS Security Group; resolved by explicitly allowing traffic originating from the Application Tier's Security Group.


* **Target Group Health Check Failing (502 Bad Gateway):** Triggered when the ALB marks instances as unhealthy due to application crashes, incorrect health check paths, or blocked SG rules; debugged via instance logs (`sudo journalctl -u app.service`) and SG verification.


* **Terraform State Lock Error:** Occurs when an abrupt cancellation leaves an orphaned lock item in the DynamoDB table; fixed using `terraform force-unlock <LOCK-ID>` or clearing the DynamoDB item.


* **Private Subnet Outbound Failure:** Happens when isolated instances fail to download packages because the private route table lacks a `0.0.0.0/0` entry pointing to the NAT Gateway.


* **GitHub Actions AWS Auth Failure:** Results from unmapped repository secrets in the workflow file leading to missing AWS credentials; resolved by properly injecting credentials via the `aws-actions/configure-aws-credentials` action.